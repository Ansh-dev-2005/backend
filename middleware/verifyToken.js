// const jwt = require('jsonwebtoken');

// Secret key for JWT signing (you should store it securely in environment variables)
const JWT=process.env.JWT_SECRET;

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Get the token from Authorization header

  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(token, JWT, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Attach decoded data (e.g., user info) to the request object for later use
    req.user = decoded;
    next();
  });
};

import jwt from 'jsonwebtoken'

export function makeJWT() {
  // const secret = process.env.JWT_SECRET;

  const keyId = 'Esqik6b7plzjyVqGOBcr';
  const secret = '4b1dndd0hbJQIzN8Oj5ORltZoLdddzAclZv93xPR8f';

  const payload = {
    iss: "ClickHouse", // Issuer
    sub: "default", // Your Key ID (sub == subject)
    aud: "619a3ade-f139-4e5d-a6e2-3a1a78f4a1fd", // Your Cluster ID
    "clickhouse:roles": ["default"],
    "clickhouse:grants": []
  }
  const options = {
    expiresIn: '15m',
    algorithm: 'HS256',
    
  };
  
  return jwt.sign(payload, secret, options);

}
