const pool = require('./config/database');

async function check() {
    try {
        const connection = await pool.getConnection();
        console.log("Connected to DB.");
        
        try {
            const [artists] = await connection.execute("DESCRIBE artists");
            console.log("ARTISTS TABLE:", artists);
        } catch(e) {
            console.log("ARTISTS TABLE DOES NOT EXIST");
        }
        
        try {
            const [artistImages] = await connection.execute("DESCRIBE artist_images");
            console.log("ARTIST IMAGES TABLE:", artistImages);
        } catch(e) {
            console.log("ARTIST IMAGES TABLE DOES NOT EXIST");
        }
        
        connection.release();
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
check();
