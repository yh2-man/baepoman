require('dotenv').config();
const { Pool } = require('pg');

const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};

const pool = new Pool(dbConfig);

async function seedCategories() {
    const client = await pool.connect();
    console.log('Connected to database for seeding categories.');

    try {
        console.log('Starting to seed categories...');

        const categoriesToInsert = [
            { name: '게임', image_url: '/images/categories/game.png' },
            { name: '스터디', image_url: '/images/categories/study.png' },
            { name: '잡담', image_url: '/images/categories/chat.png' },
            { name: '음악', image_url: '/images/categories/music.png' },
            { name: '스포츠', image_url: '/images/categories/sports.png' },
            { name: '리그오브레전드', image_url: '/images/categories/lol.png' },
            { name: '배틀그라운드', image_url: '/images/categories/pubg.png' },
            { name: '오버워치', image_url: '/images/categories/overwatch.png' },
            { name: '발로란트', image_url: '/images/categories/valorant.png' },
            { name: '메이플스토리', image_url: '/images/categories/maplestory.png' },
            { name: '던전앤파이터', image_url: '/images/categories/dnf.png' },
            { name: '로스트아크', image_url: '/images/categories/lostark.png' },
            { name: '스타크래프트', image_url: '/images/categories/starcraft.png' },
            { name: '마인크래프트', image_url: '/images/categories/minecraft.png' },
            { name: '피파온라인', image_url: '/images/categories/fifaonline.png' },
        ];

        for (const category of categoriesToInsert) {
            await client.query(
                'INSERT INTO categories (name, image_url) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING;',
                [category.name, category.image_url]
            );
        }
        console.log('Categories seeded successfully!');

    } catch (err) {
        console.error('Failed to seed categories:', err);
    } finally {
        await client.release();
        await pool.end();
        console.log('Database connection closed.');
    }
}

seedCategories();
