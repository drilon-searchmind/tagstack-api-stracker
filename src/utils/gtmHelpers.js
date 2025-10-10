export function findServerContainerUrl(messageData) {
    if (!messageData) return null;

    let serverContainerUrl = null;

    Object.keys(messageData).forEach(key => {
        const containerData = messageData[key];

        if (containerData?.entityType === 'GTM Container' && containerData.server_container_url) {
            serverContainerUrl = containerData.server_container_url;
        }

        if (containerData?.parameters) {
            containerData.parameters.forEach(param => {
                if (param.key === 'server_container_url' || param.name === 'server_container_url') {
                    const value = param.value || param.parameterValue;
                    if (value) {
                        serverContainerUrl = value;
                    }
                }
            });
        }

        if (containerData?.tags && Array.isArray(containerData.tags)) {
            containerData.tags.forEach(tag => {
                if (tag.parameters && Array.isArray(tag.parameters)) {
                    tag.parameters.forEach(param => {
                        if (param.key === 'server_container_url' || param.name === 'server_container_url') {
                            const value = param.value || param.parameterValue;
                            if (value) {
                                serverContainerUrl = value;
                            }
                        }
                    });
                }
            });
        }
    });

    if (!serverContainerUrl) {
        const messageStr = JSON.stringify(messageData);
        const serverUrlRegex = /"server_container_url"[,:]+\"([^\"]+)\"/;
        const match = messageStr.match(serverUrlRegex);
        if (match && match[1]) {
            serverContainerUrl = match[1];
        }
    }

    return serverContainerUrl;
}

export function hasServerSideTracking(serverContainerUrl, isServerSideFlag) {
    return !!serverContainerUrl || isServerSideFlag;
}

export function extractGtmContainerData(messageData) {
    let data = {
        tags: [],
        variables: [],
        triggers: [],
        cmpName: null,
        hasConsentMode: false,
        isServerSide: false,
        serverContainerUrl: null
    };

    if (!messageData) return data;

    Object.keys(messageData).forEach(key => {
        const containerData = messageData[key];

        if (containerData?.entityType === 'GTM Container') {
            data.tags = containerData.tags || [];
            data.variables = containerData.variables || [];
            data.triggers = containerData.triggers || [];
            data.cmpName = containerData.cmpName || null;

            data.hasConsentMode = containerData.consentMode ||
                containerData.consentmode ||
                containerData.hasConsentMode ||
                false;

            data.isServerSide = containerData.isServerSide || false;
        }
    });

    if (!data.hasConsentMode) {
        const messageStr = JSON.stringify(messageData);
        if (messageStr.includes('"consentMode":true') ||
            messageStr.includes('"consentmode":true') ||
            messageStr.includes('"hasConsentMode":true')) {
            data.hasConsentMode = true;
        }
    }

    const serverContainerUrl = findServerContainerUrl(messageData);
    data.isServerSide = hasServerSideTracking(serverContainerUrl, data.isServerSide);
    data.serverContainerUrl = serverContainerUrl;

    return data;
}