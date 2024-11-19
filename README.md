# Secret Santa App

## Description

This Secret Santa App is a web application built with Next.js and TypeScript. It allows users to organize a Secret Santa gift exchange by adding participants, randomly assigning Secret Santas, and sending out email notifications.

## Features

- Add, edit, and remove participants
- Responsive design for mobile and desktop
- Persistent storage of participants using local storage
- Random assignment of Secret Santas
- Email notifications to participants with their assigned recipient
- Festive UI with Christmas theme

## Technologies Used

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui components
- Node.js (for email sending)

## Installation

1. Clone the repository:

   ``` bash
   git clone https://github.com/yourusername/secret-santa-app.git
   cd secret-santa-app
   ```

2. Install dependencies:

   ``` node
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your Gmail credentials:

   ``` env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

   Note: For Gmail, you'll need to use an "App Password". You can generate one in your Google Account settings under Security > 2-Step Verification > App passwords.

4. Update the `next.config.js` file to include these environment variables:

   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     experimental: {
       serverActions: true,
     },
     env: {
       EMAIL_USER: process.env.EMAIL_USER,
       EMAIL_PASS: process.env.EMAIL_PASS,
     },
   }

   module.exports = nextConfig
   ```

## Usage

1. Start the development server:

   ``` node
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

3. Add participants by entering their names and email addresses

4. Once you have at least 3 participants, click the "Asignar Secret Santas" button to randomly assign Secret Santas and send email notifications

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
