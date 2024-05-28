const responses = {
  IQ: `Certainly! Here's a concise summary of Shubham Singh's portfolio website in plain text:

Shubham Singh's Portfolio Summary:

- Coding Journey: Shubham started coding in 2016 with C++. Later, he explored JavaScript and believes it's versatile for client apps, back-end servers, and Linux scripts.

- Hobbies: Beyond tech, Shubham delves into philosophy, psychology, and cognitive science, fascinated by the mysteries of the world and the human mind.

- Education: Initially drawn to math and physics, he found C++ programming to be the perfect blend of creativity and problem-solving.

- Work Experience: Shubham's projects include an invoice print system, Excel data processing, user data backup, and JWT-based session management.

- Highlighted Projects:
   -- Workspace: A collaborative task manager for teams.
   -- Writhub: A social media platform for writers.
   -- Canvas: A designer app for creating HTML pages.

- Tech Stack: React, Redux, Node.js, Express.js, TypeScript, PostgreSQL, Redis, MongoDB, Mongoose, Sequelize, HTML, CSS, Linux, Bash, and Nix.

Overall, Shubham is a skilled developer with diverse experience in web development, data processing, and authentication systems.`,
  IIQ: `The HTML provides details about some of Shubham Singh's work experiences, which are showcased in the "Experience" section. Here are the key work experiences mentioned:

1. Invoice Print Generation
   - Designed a system for generating, editing, printing, and downloading invoices as PDF or Excel files.
   - It involved two options: using predefined designs or editing designs using a design editor with real-time previews.
   - The edited designs could be saved as the new default JSON in the database.

2. Excel Data Processing
   - Developed a system for validation, correction, categorization, and storage of data from Excel files.
   - Utilized two workers: Schema Validation Worker and Data Validation Worker.
   - The process involved concurrently validating Excel sheets, categorizing data as valid or invalid, storing valid data in the database, and returning invalid data for user correction.

3. Client Data Backup Management
   - Implemented a database backup system for a multi-tenant architecture.
   - Each tenant could create, list, download, delete, and restore their own data backups.
   - The restore process included safeguards by creating temporary backups to prevent data loss.

4. JWT Session Management
   - Developed a JWT-based authentication system for user sessions within the application.
   - Issued JWT tokens with a fixed expiration time, stored in a cookie.
   - Implemented refresh tokens for "keep me logged in" functionality, stored securely in local storage.
   - Handled token expiration, renewal, and logout scenarios.

These work experiences showcase Shubham's skills in developing systems for invoicing, data processing, user authentication, and multi-tenant architectures, utilizing technologies like JavaScript, Node.js, and databases.`
  , IIIQ: `The HTML portfolio showcases three main projects by Shubham Singh:

1. Workspace: A collaborative task manager application that allows users to create workspaces and invite team members. Users can assign tasks and track their completion. Only workspace creators can delete workspaces, and task creators can delete tasks, while others can mark them complete. This promotes accountability and efficient task management.

2. Writhub: A social media platform for writers that supports text posts with comments, likes, promotions, and sharing. It focuses on collaboration and community among writers with a text-centric interface and engagement tools.

3. Canvas: A designer app for creating basic HTML pages with a drag-and-drop interface. It allows designs to be exported as HTML, PDF, or Excel. The app includes data visualization features for interactive charts and graphs and supports offline functionality.

These projects demonstrate Shubham's skills in developing web applications with diverse features. Workspace showcases his ability to build collaborative tools, Writhub highlights his expertise in social media platforms for specific communities, and Canvas exhibits his proficiency in design tools and data visualization. Overall, these projects highlight his versatility and user-centric approach as a developer.`
  , IVQ: `There are two ways mentioned to get in touch with Shubham Singh:

1. Through his X (formerly Twitter) profile: @5hubham_Singh

2. Through his GitHub profile: @5hubham5ingh`
  , V: `Based on the information provided in the portfolio, here are some of Shubham Singh's personality traits and personal qualities that can be highlighted:

1. Intellectual Curiosity: His interest in exploring philosophy, psychology, and cognitive science beyond his core field of technology suggests an inquisitive mind and a thirst for knowledge.

2. Lifelong Learner: The desire to understand the "two real mysteries left in the world" indicates a growth mindset and a commitment to continuous learning.

3. Appreciation for Education: The acknowledgment of inspiring teachers sparking his interest in mathematics and physics showcases his value for quality education.

4. Passion for Technology: His coding journey since 2014 and enthusiasm for different programming languages reflect his deep passion for technology and problem-solving.

5. Creative Problem-Solver: The diverse projects and innovative solutions demonstrate his creativity and ability to approach problems from unique perspectives.

6. Attention to Detail: The level of detail in technical explanations and diagrams suggests a meticulous and precise approach to his work.

7. Communicative: The clear and well-structured presentation of information in the portfolio implies strong communication skills.

8. Adaptable: His proficiency in a wide range of technologies and programming languages suggests an ability to adapt and learn new skills as required.

9. Ambitious: The portfolio showcases a diverse array of projects and experiences, indicating an ambitious and driven individual striving for growth and challenge.

10. Collaborative Mindset: While not explicitly stated, the collaborative nature of some projects like Workspace hints at a willingness to work in teams and contribute to shared goals.

These traits and qualities provide insights into Shubham's intellectual curiosity, love for learning, attention to detail, creative problem-solving abilities, and passion for technology, among others. The portfolio allows glimpses into his personal values, mindset, and approach to work, beyond just his professional skills and experiences.`
}


const nextQueries = {
  IIQ: 'Tell me about his work experience.',
  IIIQ: 'Tell me about his projects.',
  IVQ: ' How can i get in touch with him?',
  V: 'Describe his personality traits and personal qualities.'
}
const legends = {
  IIQ: 'Work experience.',
  IIIQ: 'Projects',
  IVQ: 'Contacts',
  V: 'Personality traits & qualities'
}
const responseContainer = document.getElementById('response');
const queryContainer = document.getElementById('query');
const responseLegend = document.getElementById('responseLegend')
let index = 0;

function typeText(id) {
  const text = responses[id]
  if (text[index] === '\n') {
    responseContainer.innerHTML += '<br>'; // Add line break
  } else {
    responseContainer.innerHTML += text[index];
    responseContainer.scrollTop = responseContainer.scrollHeight;
  }
  index++;
  if (index < text.length) {
    setTimeout(typeText, Math.random() * 10, id);
  }
  else {
    addNextQueryOptions(id)
  }
}
typeText('IQ');

const addNextQueryOptions = (curQueryCount) => {
  const nextQueriesContainer = document.createElement('div')
  nextQueriesContainer.id = 'more'
  nextQueriesContainer.innerHTML = (() => {
    let buttons = '';
    for (let queryCount in nextQueries) {
      if (queryCount === curQueryCount) continue;
      buttons += `<button id=${queryCount} onClick='handleClick(event)' type="button">${nextQueries[queryCount]}</button>`
    }
    return buttons;
  })()
  document.body.insertAdjacentElement('afterend', nextQueriesContainer);
}

const handleClick = (e) => {
  const id = e.target.id;
  const button = document.getElementById(id)
  const query = button.innerText;
  queryContainer.innerHTML = `<legend>@User29306</legend> ${query}`;
  document.querySelectorAll('button').forEach(button => button.parentNode.removeChild(button));
  responseContainer.innerText = '';
  index = 0;
  typeText(id);
  responseLegend.innerText = legends[id];
}

