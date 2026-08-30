const defaultProjects = [
    {
        id: 1,
        name: "Portfolio Website",
        technology: "JavaScript",
        status: "In Progress",
        progress: 60
    },
    {
        id: 2,
        name: "E-Commerce App",
        technology: "Node.js",
        status: "Planned",
        progress: 10
    },
    {
        id: 3,
        name: "DevHub",
        technology: "Full Stack JavaScript",
        status: "In Progress",
        progress: 20
    }
];

// 1. Storage check karo
let storedProjects = localStorage.getItem('devhub_projects');

// 2. Agar pehli baar khol rahe ho (null hai), toh default save kar do
if (!storedProjects) {
    localStorage.setItem('devhub_projects', JSON.stringify(defaultProjects));
    storedProjects = JSON.stringify(defaultProjects);
}

// 3. projects array set karo
let projects = JSON.parse(storedProjects);