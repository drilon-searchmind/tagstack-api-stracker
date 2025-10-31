import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');
console.log('Looking for .env file at:', envPath);

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('✅ .env file loaded successfully');
}

console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');

const { default: User } = await import('../src/models/User.js');

async function createTestUser() {
  try {
    console.log('\nCreating test user...');
    
    const existingUser = await User.findByEmail('test@tagstack.com');
    
    if (existingUser) {
      console.log('✅ Test user already exists');
      console.log('Email: test@tagstack.com');
      console.log('Password: test123');
      console.log('Full Name:', existingUser.fullName);
      console.log('Role:', existingUser.role);
      return;
    }

    const testUser = await User.createUser({
      email: 'test@tagstack.com',
      password: 'test123',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      role: 'admin',
      emailVerified: true,
      isActive: true
    });

    console.log('✅ Test user created successfully!');
    console.log('Email: test@tagstack.com');
    console.log('Password: test123');
    console.log('Full Name:', testUser.fullName);
    console.log('Role:', testUser.role);
    console.log('Username:', testUser.username);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    
    if (error.name === 'ValidationError') {
      console.error('Validation errors:');
      Object.values(error.errors).forEach(err => {
        console.error(`  - ${err.message}`);
      });
    }
    
    process.exit(1);
  }
}

createTestUser();