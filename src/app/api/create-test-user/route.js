import User from '../../../models/User.js';

export async function POST(request) {
  try {
    const existingUser = await User.findByEmail('test@tagstack.com');
    
    if (existingUser) {
      return Response.json(
        { message: 'Test user already exists' },
        { status: 200 }
      );
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

    return Response.json(
      { 
        message: 'Test user created successfully',
        user: {
          email: testUser.email,
          username: testUser.username,
          role: testUser.role,
          fullName: testUser.fullName
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating test user:', error);
    
    if (error.name === 'ValidationError') {
      return Response.json(
        { 
          error: 'Validation failed',
          details: Object.values(error.errors).map(err => err.message)
        },
        { status: 400 }
      );
    }
    
    if (error.code === 11000) {
      return Response.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      );
    }
    
    return Response.json(
      { error: 'Failed to create test user' },
      { status: 500 }
    );
  }
}