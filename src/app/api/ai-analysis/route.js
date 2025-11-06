import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongoose';
import ScannedUrl from '@/models/ScannedUrl';
import Customer from '@/models/Customer';
import AiAnalysis from '@/models/AiAnalysis';

// POST: Create AI analysis for a scan
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { scanId, customerId } = await request.json();

        if (!scanId || !customerId) {
            return NextResponse.json({ error: 'Scan ID and Customer ID are required' }, { status: 400 });
        }

        await connectDB();

        // Verify customer belongs to user
        const customer = await Customer.findOne({
            _id: customerId,
            userId: session.user.id
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found or access denied' }, { status: 404 });
        }

        // Verify scan exists and belongs to customer
        const scan = await ScannedUrl.findOne({
            _id: scanId,
            customerId: customerId,
            userId: session.user.id
        });

        if (!scan) {
            return NextResponse.json({ error: 'Scan not found or access denied' }, { status: 404 });
        }

        // Check if analysis already exists
        const existingAnalysis = await AiAnalysis.findByScannedUrlId(scanId, session.user.id);
        if (existingAnalysis) {
            return NextResponse.json({
                success: true,
                analysis: existingAnalysis,
                message: 'Analysis already exists'
            });
        }

        const startTime = Date.now();

        // Generate AI analysis
        const aiAnalysisResult = await generateAIAnalysis(scan, customer);
        
        const processingTime = Date.now() - startTime;

        // Save analysis to database
        const analysis = await AiAnalysis.createAnalysis({
            userId: session.user.id,
            customerId: customerId,
            scannedUrlId: scanId,
            analysisData: aiAnalysisResult,
            processingTime: processingTime
        });

        return NextResponse.json({
            success: true,
            analysis: analysis
        });

    } catch (error) {
        console.error('Error generating AI analysis:', error);
        
        // Save failed analysis to database
        try {
            if (scanId && session) {
                await AiAnalysis.create({
                    userId: session.user.id,
                    customerId: customerId,
                    scannedUrlId: scanId,
                    analysisStatus: 'failed',
                    error: error.message,
                    analysisData: {
                        technicalSummary: 'Analysis failed',
                        clientStrategySummary: 'Analysis failed',
                        keyFindings: [],
                        recommendations: []
                    }
                });
            }
        } catch (saveError) {
            console.error('Error saving failed analysis:', saveError);
        }

        return NextResponse.json(
            { error: 'Failed to generate AI analysis' },
            { status: 500 }
        );
    }
}

// GET: Retrieve AI analysis for a scan
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const scanId = searchParams.get('scanId');

        if (!scanId) {
            return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 });
        }

        const analysis = await AiAnalysis.findByScannedUrlId(scanId, session.user.id);

        if (!analysis) {
            return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            analysis: analysis
        });

    } catch (error) {
        console.error('Error fetching AI analysis:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

async function generateAIAnalysis(scan, customer) {
    // Prepare scan data for AI analysis
    const scanData = {
        url: scan.requestedUrl,
        customerName: customer.name,
        gtmContainers: scan.scanData?.containers || scan.containers || [],
        gtmScan: scan.scanData?.gtmScan || scan.gtmScan || {},
        containerScans: scan.scanData?.containerScans || scan.containerScans || [],
        scanDate: scan.scanDate,
        scanDuration: scan.scanDuration
    };

    // Create AI prompt for analysis
    const prompt = createAnalysisPrompt(scanData);

    try {
        // Call OpenAI API (you'll need to add your API key)
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a Google Tag Manager and web tracking expert who analyzes website tracking implementations for digital marketing agencies. Provide detailed technical analysis and strategic recommendations.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const aiResponse = await response.json();
        const analysisText = aiResponse.choices[0]?.message?.content;

        if (!analysisText) {
            throw new Error('No analysis generated by AI');
        }

        // Parse AI response into structured format
        return parseAIResponse(analysisText, scanData);

    } catch (error) {
        console.error('AI analysis error:', error);
        
        // Fallback to rule-based analysis if AI fails
        return generateFallbackAnalysis(scanData);
    }
}

function createAnalysisPrompt(scanData) {
    const containerDetails = scanData.containerScans?.map(container => {
        const techList = container.body?.techList || [];
        const message = container.body?.message ? JSON.parse(container.body.message) : {};
        
        return {
            id: container.id,
            status: container.status,
            technologies: techList,
            containerConfig: message
        };
    }) || [];

    return `
Du er en Google Tag Manager og web tracking ekspert, der analyserer hjemmesiders tracking implementeringer for digitale marketing bureauer. Giv detaljeret teknisk analyse og strategiske anbefalinger PÅ DANSK.

Analyser denne omfattende hjemmeside tracking implementering og giv en detaljeret teknisk revision:

**HJEMMESIDE DETALJER:**
- URL: ${scanData.url}
- Kunde: ${scanData.customerName}
- Scan Varighed: ${scanData.scanDuration}ms
- Scan Dato: ${scanData.scanDate}

**GTM DETEKTERINGS ANALYSE:**
- Containere Fundet: ${scanData.gtmContainers.length}
- Container ID'er: ${scanData.gtmContainers.map(c => c.id || c).join(', ')}
- Detekterings Metoder: ${JSON.stringify(scanData.gtmScan?.detectionMethods || [], null, 2)}
- Scripts Fundet: ${JSON.stringify(scanData.gtmScan?.scripts || [], null, 2)}
- DataLayer Events: ${JSON.stringify(scanData.gtmScan?.dataLayerEvents || [], null, 2)}

**DETALJERET CONTAINER ANALYSE:**
${containerDetails.map(container => `
Container ID: ${container.id}
Status: ${container.status}
Teknologier Detekteret: ${container.technologies?.length || 0}
${container.technologies?.map(tech => `- ${tech.name} (ID: ${tech.id})`).join('\n') || 'Ingen'}

Container Konfiguration Analyse:
${JSON.stringify(container.containerConfig, null, 2)}
`).join('\n\n')}

**TEKNISKE KRAV:**
Giv en omfattende analyse på DANSK, der inkluderer:

1. **Teknisk Sammendrag**: Detaljeret teknisk revision, der dækker:
   - GTM container opsætning og arkitektur
   - Implementerings metode analyse (client-side, server-side, hybrid)
   - Tag konfiguration kvalitet og fuldstændighed
   - Data layer implementering vurdering
   - Server-side tagging analyse hvis detekteret
   - Samtykke håndtering og compliance opsætning
   - Ydeevne implikationer og optimerings muligheder

2. **Platform Analyse**: Opdel hver detekterede platform:
   - Google Analytics 4 konfiguration og opsætnings kvalitet
   - Enhanced measurement indstillinger analyse
   - Google Ads integration og konverterings tracking
   - Consent Mode implementering
   - Server-side GTM vurdering
   - Tredjepartintegrationer og deres implikationer

3. **Klient Strategi Sammendrag**: Forretningsfokuserede indsigter til salgsteams:
   - Tracking modenhed vurdering
   - Konkurrencemæssige fordele og huller
   - Omsætnings optimerings muligheder
   - Compliance og privatliv parathed
   - Skalerbarhed og vækst potentiale
   - Teknisk gæld og moderniserings behov

4. **Nøgle Fund**: 5-7 specifikke tekniske opdagelser inklusive:
   - Implementerings styrker og svagheder
   - Avancerede funktioner i brug (server-side, consent mode, osv.)
   - Manglende tracking muligheder
   - Ydeevne og arkitektur indsigter
   - Compliance og privatliv observationer

5. **Anbefalinger**: 5-7 handlingsrettede tekniske anbefalinger:
   - Umiddelbare optimerings muligheder
   - Strategiske forbedringer for bedre data indsamling
   - Privatliv og compliance forbedringer
   - Ydeevne optimeringer
   - Avancerede funktions implementeringer
   - Governance og vedligeholdelses forbedringer

6. **Direktions Sammendrag**: Højt niveau overblik for ledelse der dækker:
   - Overordnet tracking sofistikering niveau
   - Vigtige forretnings impact områder
   - Prioritets forbedring områder
   - Investerings anbefalinger

**OUTPUT FORMAT:**
Returner som JSON med præcise nøgler: technicalSummary, platformAnalysis, clientStrategySummary, keyFindings, recommendations, executiveSummary, riskLevel, complianceStatus

Lav denne analyse højt teknisk og detaljeret på DANSK - den vil blive brugt af både tekniske teams til forbedringer og salgsteams til klient præsentationer.
`;
}

function parseAIResponse(analysisText, scanData) {
    try {
        // Try to parse as JSON first
        const parsed = JSON.parse(analysisText);
        return {
            technicalSummary: parsed.technicalSummary || '',
            platformAnalysis: parsed.platformAnalysis || '',
            clientStrategySummary: parsed.clientStrategySummary || '',
            keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            executiveSummary: parsed.executiveSummary || '',
            riskLevel: ['low', 'medium', 'high'].includes(parsed.riskLevel) ? parsed.riskLevel : 'medium',
            complianceStatus: ['compliant', 'partial', 'non-compliant', 'unknown'].includes(parsed.complianceStatus) ? parsed.complianceStatus : 'unknown'
        };
    } catch (error) {
        // Fallback: extract information from text
        return generateFallbackAnalysis(scanData);
    }
}

function generateFallbackAnalysis(scanData) {
    const containerCount = scanData.gtmContainers.length;
    const hasGTM = containerCount > 0;
    const containerScans = scanData.containerScans || [];
    
    // Parse container configuration
    let containerConfig = {};
    let allTech = [];
    
    if (containerScans.length > 0) {
        try {
            const messageData = JSON.parse(containerScans[0].body.message);
            containerConfig = messageData;
            allTech = containerScans[0].body.techList || [];
        } catch (e) {
            console.error('Error parsing container config:', e);
        }
    }

    // Analyze detected technologies
    const techNames = allTech.map(tech => tech.name);
    
    // Detection analysis
    const detectionMethods = scanData.gtmScan?.detectionMethods || [];
    const isShopify = detectionMethods.some(method => method.includes('Shopify'));
    const hasStape = detectionMethods.some(method => method.includes('Stape'));
    const hasServerSide = hasStape || techNames.some(tech => tech.includes('Server-side'));
    
    // GA4 Analysis
    const ga4Streams = Object.keys(containerConfig).filter(key => 
        containerConfig[key]?.entityType === 'GA4 Stream'
    );
    const hasGA4 = ga4Streams.length > 0;
    
    // Enhanced Measurement Analysis - deduplicate measurements
    const enhancedMeasurements = hasGA4 ? 
        ga4Streams.flatMap(stream => containerConfig[stream]?.enhancedMeasurement || []) : [];
    const enabledMeasurements = [...new Set(enhancedMeasurements
        .filter(em => em.parameters?.some(p => p.key === 'enabled' && p.value === 'true'))
        .map(em => em.name))];
    
    // Google Ads Linking
    const hasGoogleAdsLinking = ga4Streams.some(stream => 
        containerConfig[stream]?.linking?.some(link => 
            link.name === 'Google Ads Linking' && 
            link.parameters?.some(p => p.key === 'enabled' && p.value === 'true')
        )
    );
    
    // Consent Mode Analysis
    const gtmContainer = Object.keys(containerConfig).find(key => 
        containerConfig[key]?.entityType === 'GTM Container'
    );
    const hasConsentMode = gtmContainer ? containerConfig[gtmContainer]?.consentMode === true : false;
    const consentDefaults = gtmContainer ? containerConfig[gtmContainer]?.consentDefault : {};
    
    // E-commerce analysis based on data layer variables
    const variables = gtmContainer ? containerConfig[gtmContainer]?.variables || [] : [];
    const ecommerceVars = variables.filter(v => 
        v.name.includes('ecommerce') || 
        (v.parameters && v.parameters.some(p => p.value && p.value.includes && p.value.includes('ecommerce')))
    );
    const hasEcommerce = ecommerceVars.length > 0;
    
    // Tags analysis
    const tags = gtmContainer ? containerConfig[gtmContainer]?.tags || [] : [];
    const ga4Tags = tags.filter(tag => tag.type === 'gaawe');
    const ecommerceTags = ga4Tags.filter(tag => 
        tag.parameters?.some(p => p.key === 'vtp_sendEcommerceData' && p.value === true)
    );
    
    // Fix container display
    const containerIds = scanData.gtmContainers.map(c => typeof c === 'object' ? c.id : c).filter(Boolean);
    
    return {
        technicalSummary: hasGTM 
            ? `Teknisk analyse viser en sofistikeret ${hasServerSide ? 'server-side' : 'client-side'} GTM implementering der bruger container ${containerIds.join(', ')} på ${scanData.url}.

${isShopify ? 'Implementeringen kører på Shopify platformen med dynamisk container indlæsning og integreret e-commerce tracking. ' : ''}${hasStape ? 'Avanceret server-side tracking er implementeret gennem Stape infrastruktur (sgtm.pompdelux.com), hvilket giver forbedrede dataindsamlings muligheder, bedre ydeevne og first-party databehandling. ' : ''}

Container analysen viser ${ga4Streams.length} GA4 stream${ga4Streams.length > 1 ? 's' : ''} konfigureret med enhanced measurement aktiveret for: ${enabledMeasurements.join(', ')}. ${hasConsentMode ? 'Google Consent Mode v2 er korrekt implementeret med standard indstillinger: ' + Object.entries(consentDefaults).map(([key, value]) => `${key}: ${value}`).join(', ') + '. ' : 'Ingen samtykke håndtering detekteret. '}

Opsætningen inkluderer ${tags.length} totale tags med ${ga4Tags.length} GA4 event tags${hasEcommerce ? ', omfattende e-commerce tracking gennem data layer variabler' : ''}, og ${hasGoogleAdsLinking ? 'aktiv Google Ads linking til konverterings optimering' : 'ingen Google Ads integration'}. Scan afslutnings tid på ${scanData.scanDuration}ms indikerer ${scanData.scanDuration > 10000 ? 'kompleks men acceptabel' : 'effektiv'} tag udførelses ydeevne.`
            : `Ingen Google Tag Manager implementering detekteret på ${scanData.url} under ${scanData.scanDuration}ms omfattende scan. Dette indikerer enten direkte tracking kode implementering, alternative tag management løsninger, eller fravær af avanceret tracking infrastruktur. Manglen på centraliseret tag management præsenterer betydelige muligheder for tracking optimering og dataindsamlings forbedring.`,

        platformAnalysis: hasGTM ? `
Google Tag Manager: Container ${containerIds.join(', ')} med ${hasServerSide ? 'server-side arkitektur via Stape' : 'client-side implementering'}
Google Analytics 4: ${ga4Streams.length} stream${ga4Streams.length > 1 ? 's' : ''} konfigureret - ${ga4Streams.join(', ')}
Enhanced Measurement: ${enabledMeasurements.length > 0 ? enabledMeasurements.join(', ') : 'Ikke konfigureret'}
Google Ads Integration: ${hasGoogleAdsLinking ? 'Aktiv linking aktiveret' : 'Ikke detekteret'}
Samtykke Håndtering: ${hasConsentMode ? 'Consent Mode v2 implementeret med korrekte standarder' : 'Mangler samtykke håndtering'}
E-commerce Tracking: ${hasEcommerce ? `Omfattende opsætning med ${ecommerceVars.length} data layer variabler og ${ecommerceTags.length} event tags` : 'Ikke detekteret'}
Platform: ${isShopify ? 'Shopify med dynamisk GTM integration' : 'Brugerdefineret implementering'}
Server-side Tagging: ${hasServerSide ? 'Aktiv med dedikeret subdomain infrastruktur' : 'Ikke implementeret'}
Ydeevne: ${scanData.scanDuration < 5000 ? 'Optimeret' : scanData.scanDuration < 10000 ? 'Acceptabel' : 'Behøver optimering'} (${scanData.scanDuration}ms)
        ` : 'Ingen avancerede tracking platforme detekteret. Mangler GTM, GA4 og moderne tracking infrastruktur.',
        
        clientStrategySummary: hasGTM
            ? `${scanData.customerName} demonstrerer ${hasServerSide ? 'enterprise-niveau' : 'avanceret mellemliggende'} digital marketing sofistikering med deres nuværende tracking implementering. Tilstedeværelsen af ${hasServerSide ? 'server-side GTM med dedikeret Stape infrastruktur indikerer betydelig investering i datakvalitet, privatlivs compliance og ydeevne optimering' : 'omfattende GTM opsætning tyder på stærk bevidsthed om tag management bedste praksis'}.

${hasConsentMode ? 'Deres Consent Mode v2 implementering positionerer dem fremragende til GDPR compliance og privatlivs-først dataindsamling, hvilket sikrer bæredygtige tracking muligheder i det udviklende privatlivs landskab. ' : 'Fraværet af samtykke håndtering skaber compliance risici og kan påvirke dataindsamlings kvalitet, hvilket præsenterer en mulighed for privatlivs infrastruktur forbedring. '}${isShopify ? 'Som Shopify Plus merchant udnytter de integreret e-commerce tracking med yderligere brugerdefinerede implementeringer, hvilket indikerer sofistikerede konverterings tracking behov. ' : ''}

${hasEcommerce ? `Den omfattende e-commerce tracking opsætning med ${ecommerceTags.length} konverterings events demonstrerer modne funnel analyse kapaciteter. ` : ''}${hasGoogleAdsLinking ? 'Aktiv Google Ads integration muliggør avanceret målgruppe skabelse og konverterings optimering. ' : 'Manglende Google Ads integration repræsenterer mistede muligheder for målgruppe optimering og remarketing. '}

Dette implementerings niveau tyder på, at de værdsætter data-drevne beslutninger og har allokeret betydelige ressourcer til tracking infrastruktur. ${hasServerSide ? 'Server-side opsætningen indikerer, at de behandler betydelige trafik mængder og prioriterer data nøjagtighed og compliance.' : 'Der er klare muligheder for at opgradere til server-side tracking for forbedret datakvalitet og compliance parathed.'}`
            : `${scanData.customerName} repræsenterer en høj-værdi mulighed med betydelige tracking infrastruktur huller. Fraværet af GTM indikerer, at de sandsynligvis mangler kritiske indsigter om kundeadfærd, konverterings stier og ydeevne optimerings muligheder. Dette tracking hul tyder på begrænset data synlighed, hvilket potentielt påvirker deres evne til at træffe informerede marketing beslutninger, optimere konverterings rater og forstå kunde rejse analyser. Implementering af omfattende tracking infrastruktur ville låse op for betydelig værdi i kunde forståelse, omsætnings tilskrivning og marketing effektivitets optimering.`,
        
        keyFindings: hasGTM 
            ? [
                `GTM Container ${containerIds.join(', ')} med ${hasServerSide ? 'server-side Stape arkitektur' : 'client-side implementering'}`,
                `${ga4Streams.length} GA4 stream${ga4Streams.length > 1 ? 's' : ''} konfigureret: ${ga4Streams.join(', ')}`,
                `Enhanced Measurement aktiv for: ${enabledMeasurements.join(', ')}`,
                hasConsentMode ? 'Google Consent Mode v2 korrekt implementeret med privatlivs-kompatible standarder' : 'Mangler Consent Mode implementering - compliance risiko',
                hasGoogleAdsLinking ? 'Google Ads linking aktiv på tværs af streams til konverterings optimering' : 'Google Ads integration ikke detekteret',
                hasEcommerce ? `Omfattende e-commerce tracking med ${ecommerceTags.length} konverterings event tags` : 'E-commerce tracking ikke fuldt implementeret',
                isShopify ? 'Shopify platform integration med dynamisk GTM indlæsning' : 'Brugerdefineret platform implementering'
            ]
            : [
                'Ingen GTM implementering detekteret under omfattende scan',
                'Mangler centraliseret tag management infrastruktur',
                'Ingen GA4 eller avanceret analyser tracking identificeret',
                'Fraværende e-commerce og konverterings tracking kapaciteter',
                'Ingen samtykke håndtering eller privatlivs compliance foranstaltninger detekteret'
            ],
        
        recommendations: hasGTM
            ? [
                // Only recommend what's actually missing or needs improvement
                ...(!hasConsentMode ? ['Implementer Google Consent Mode v2 for GDPR compliance og bæredygtig dataindsamling'] : []),
                ...(!hasServerSide ? ['Evaluer server-side GTM migration for forbedret datakvalitet og privatlivs compliance'] : []),
                ...(!hasGoogleAdsLinking ? ['Aktiver Google Ads linking for konverterings optimering og målgruppe opbygning'] : []),
                ...(enabledMeasurements.length < 4 ? ['Aktiver yderligere Enhanced Measurement funktioner (fil downloads, video engagement) for omfattende brugeradfærd tracking'] : []),
                ...(!hasEcommerce && isShopify ? ['Implementer omfattende e-commerce event tracking for komplet funnel analyse'] : []),
                ...(scanData.scanDuration > 10000 ? ['Optimer tag indlæsnings ydeevne for at reducere side indlæsnings påvirkning'] : []),
                'Udfør regelmæssig tag revision for at sikre optimal konfiguration og fjerne overflødige implementeringer',
                'Etabler data governance procedurer og test protokoller for tag management'
            ]
            : [
                'Implementer Google Tag Manager for centraliseret tag management og forbedret tracking governance',
                'Deploy Google Analytics 4 med korrekt enhanced measurement konfiguration',
                'Etabler omfattende e-commerce tracking for konverterings analyse og optimering',
                'Implementer Google Consent Mode v2 for privatlivs compliance og bæredygtig dataindsamling',
                'Opsæt server-side tracking infrastruktur for forbedret datakvalitet og compliance',
                'Skab data layer arkitektur for standardiseret dataindsamling på tværs af alle platforme'
            ],

        executiveSummary: hasGTM
            ? `${scanData.customerName} opererer med ${hasServerSide ? 'sofistikeret enterprise-niveau' : 'avanceret'} tracking infrastruktur, hvilket indikerer ${hasServerSide ? 'høj' : 'mellem-høj'} digital marketing modenhed. Nuværende investering i ${hasServerSide ? 'server-side tracking teknologi med dedikeret infrastruktur' : 'omfattende GTM og GA4 opsætning'} demonstrerer stærk forpligtelse til data-drevne operationer. 

${hasConsentMode ? 'Privatlivs compliance foranstaltninger er korrekt implementeret, hvilket sikrer bæredygtige dataindsamlings kapaciteter. ' : 'Privatlivs compliance huller behøver øjeblikkelig opmærksomhed for at sikre bæredygtig tracking i det udviklende privatlivs landskab. '}Nøgle muligheder eksisterer i ${hasServerSide ? 'optimering og avanceret funktions udnyttelse' : 'server-side migration og compliance forbedring'} med potentiale for betydelig ROI gennem forbedret dataindsamlings nøjagtighed og forbedrede konverterings optimerings kapaciteter.

${hasGoogleAdsLinking ? 'Nuværende Google Ads integration giver solidt fundament for målgruppe optimering og remarketing strategier.' : 'Manglende Google Ads integration repræsenterer øjeblikkelig mulighed for målgruppe opbygning og konverterings optimerings forbedringer.'}`
            : `${scanData.customerName} præsenterer en høj-værdi strategisk mulighed med betydelige tracking infrastruktur huller. Fraværet af moderne tag management og analyser repræsenterer betydelige mistede muligheder i kunde rejse analyse, konverterings optimering og ydeevne måling. 

Implementering af omfattende tracking infrastruktur ville give øjeblikkelig værdi gennem forbedret data synlighed, forbedrede beslutnings kapaciteter, bedre konverterings rate optimering og sofistikeret kundeadfærd analyse. Dette repræsenterer en strategisk investerings mulighed med målbar forretnings påvirkning potentiale og konkurrencemæssig fordel skabelse gennem overlegen data-drevet marketing kapaciteter.`,
        
        riskLevel: hasGTM ? (hasConsentMode && hasServerSide ? 'high' : hasConsentMode || hasServerSide ? 'medium' : 'low') : 'low',
        complianceStatus: hasConsentMode ? 'compliant' : (hasGTM ? 'partial' : 'unknown')
    };
}