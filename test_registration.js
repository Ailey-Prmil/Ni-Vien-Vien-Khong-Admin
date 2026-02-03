// Node 18+ has native fetch, no need to require

const API_URL = 'http://localhost:1337/api';

async function testRegistration() {
    console.log('--- STARTING REGISTRATION TEST ---');

    // 1. Create a Dummy Course
    console.log('1. Creating Dummy Course...');
    let courseId;
    try {
        const courseRes = await fetch(`${API_URL}/courses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: {
                    courseName: 'Test Course ' + Date.now(),
                    category: 'Khác',
                }
            })
        });
        const courseData = await courseRes.json();
        if (courseData.error) throw new Error(JSON.stringify(courseData.error));
        courseId = courseData.data.id;
        console.log('   -> Course Created with ID:', courseId);
    } catch (error) {
        console.log('   -> Failed to create course (likely 403). Trying to fetch existing courses...');
        try {
            const getRes = await fetch(`${API_URL}/courses`);
            const getData = await getRes.json();
            console.log('   -> GET /courses response:', JSON.stringify(getData));
            if (getData.data && getData.data.length > 0) {
                courseId = getData.data[0].id;
                console.log('   -> Found existing course ID:', courseId);
            } else {
                console.error('   -> No existing courses found to register for.');
                return;
            }
        } catch (err) {
            console.error('   -> Failed to fetch courses:', err.message);
            return;
        }
    }

    // 2. Register a User
    console.log('2. Registering User...');
    try {
        const regRes = await fetch(`${API_URL}/course-registrations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: {
                    fullName: 'Test User',
                    email: 'test@example.com',
                    phoneNumber: '+84900000000',
                    registedCourse: courseId
                }
            })
        });
        const regData = await regRes.json();
        if (regData.error) throw new Error(JSON.stringify(regData.error));
        console.log('   -> Registration Created with ID:', regData.data.id);
        console.log('   -> CHECK TERMINAL FOR "DEBUG: Confirmation Link"');
    } catch (error) {
        console.error('   -> Failed to register:', error.message);
    }
}

// Simple retry loop to wait for server
async function waitForServerAndRun() {
    for (let i = 0; i < 30; i++) {
        try {
            await fetch(API_URL);
            console.log('Server is UP. Running test...');
            await testRegistration();
            return;
        } catch (e) {
            console.log('Waiting for server...');
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    console.error('Server timed out.');
}

waitForServerAndRun();
