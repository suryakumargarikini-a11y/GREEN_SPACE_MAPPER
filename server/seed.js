import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Space from './models/Space.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/green-space-mapper';

const indianSpaces = [
    {
        name: 'Lodhi Gardens',
        description: 'A city park situated in New Delhi, containing Mohammed Shah\'s Tomb, Tomb of Sikandar Lodi, Shisha Gumbad and Bara Gumbad.',
        location: {
            lat: 28.5933,
            lng: 77.2197
        },
        facilities: ['garden', 'walking_track', 'benches'],
        area: '90 acres',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Lodhi_Gardens_-_Bara_Gumbad.jpg/800px-Lodhi_Gardens_-_Bara_Gumbad.jpg'
    },
    {
        name: 'Cubbon Park',
        description: 'Sri Chamarajendra Park, historically known as Cubbon Park, is a landmark park space of Bangalore, located within the heart of the city.',
        location: {
            lat: 12.9779,
            lng: 77.5952
        },
        facilities: ['playground', 'walking_track', 'garden', 'benches'],
        area: '300 acres',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Cubbon_Park_2.jpg/800px-Cubbon_Park_2.jpg'
    },
    {
        name: 'Lalbagh Botanical Garden',
        description: 'Lalbagh Botanical Garden is an old botanical garden in Bengaluru, India. It has a famous glass house which hosts two annual flower shows.',
        location: {
            lat: 12.9507,
            lng: 77.5848
        },
        facilities: ['garden', 'walking_track', 'benches'],
        area: '240 acres',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Lalbagh_Glasshouse_Bangalore.jpg/800px-Lalbagh_Glasshouse_Bangalore.jpg'
    },
    {
        name: 'Sanjay Gandhi National Park',
        description: 'Sanjay Gandhi National Park is a 87 km² protected area in Mumbai, Maharashtra State in India.',
        location: {
            lat: 19.2288,
            lng: 72.8711
        },
        facilities: ['walking_track', 'benches', 'garden'],
        area: '87 km²',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Kanheri_Caves_Mumbai.jpg/800px-Kanheri_Caves_Mumbai.jpg'
    },
    {
        name: 'Brindavan Gardens',
        description: 'The Brindavan Gardens is a celebrated beauty spot in Karnataka, spread across 150 acres and famous for its symmetric design and terrace gardens.',
        location: {
            lat: 12.4255,
            lng: 76.5739
        },
        facilities: ['garden', 'walking_track', 'benches'],
        area: '150 acres',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Brindavan_Gardens_KRS.jpg/800px-Brindavan_Gardens_KRS.jpg'
    },
    {
        name: 'Eco Park, New Town',
        description: 'Eco Park is an urban park in New Town, Kolkata and the biggest park so far in India.',
        location: {
            lat: 22.5996,
            lng: 88.4735
        },
        facilities: ['playground', 'walking_track', 'garden', 'benches', 'sports_area'],
        area: '480 acres',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Eco_Park_Kolkata.jpg/800px-Eco_Park_Kolkata.jpg'
    }
];

async function seedDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Optional: clear existing spaces
        // await Space.deleteMany({});
        // console.log('Cleared existing spaces');

        await Space.insertMany(indianSpaces);
        console.log(`Successfully seeded ${indianSpaces.length} Indian green spaces!`);
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

seedDB();
