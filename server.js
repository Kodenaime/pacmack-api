import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';




dotenv.config();

const app = express();
// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

const corsOptions = {
  origin: [
    'https://pacmack.com/', // Your production domain
    'http://localhost:5173' // For local development
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};





// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Registration Model
const registrationSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  middleName: { type: String, required: true },
  ageBracket: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  whatsappPhone: { type: String, required: true },
  passportCountry: { type: String, required: true },
  countryOfResidence: { type: String, required: true },
  regionState: { type: String, required: true },
  sex: { type: String, required: true },
  educationLevel: { type: String, required: true },
  courseOfStudy: { type: String, required: true },
  occupation: { type: String, required: true },
  sendingOrganization: { type: String, required: true },
  applicantType: { type: String, required: true },
  firstTimeAttending: { type: String, required: true },
  selfFunding: { type: String, required: true },
  scholarshipNeeded: { type: String },
  belongsToMKGroup: { type: String, required: true },
  referenceInfo: { type: String, required: true },
  registrationDate: { type: Date, default: Date.now }
});

const Registration = mongoose.model('Registration', registrationSchema);

// Contact Form Messages Model
const contactMessageSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
   lastName: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [
      /^[\+]?[1-9][\d]{0,15}$/,
      'Please enter a valid phone number'
    ]
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isReplied: {
    type: Boolean,
    default: false
  }
});

// Create indexes for better query performance
contactMessageSchema.index({ sentAt: -1 });
contactMessageSchema.index({ isRead: 1 });
contactMessageSchema.index({ email: 1 });

const Contacts = mongoose.model('ContactMessage', contactMessageSchema);

// Generate Excel Endpoint
app.get('/api/registrations/export', async (req, res) => {
  try {
    const registrations = await Registration.find();
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registrations');
    
    // Add headers
    worksheet.columns = [
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Middle Name', key: 'middleName', width: 15 },
      { header: 'Age Bracket', key: 'ageBracket', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'WhatsApp Phone', key: 'whatsappPhone', width: 20 },
      { header: 'Passport Country', key: 'passportCountry', width: 20 },
      { header: 'Country of Residence', key: 'countryOfResidence', width: 20 },
      { header: 'Region/State', key: 'regionState', width: 15 },
      { header: 'Sex', key: 'sex', width: 10 },
      { header: 'Education Level', key: 'educationLevel', width: 20 },
      { header: 'Course of Study', key: 'courseOfStudy', width: 20 },
      { header: 'Occupation', key: 'occupation', width: 20 },
      { header: 'Sending Organization', key: 'sendingOrganization', width: 25 },
      { header: 'Applicant Type', key: 'applicantType', width: 20 },
      { header: 'First Time Attending', key: 'firstTimeAttending', width: 20 },
      { header: 'Self Funding', key: 'selfFunding', width: 15 },
      { header: 'Scholarship Needed', key: 'scholarshipNeeded', width: 20 },
      { header: 'Belongs to MK Group', key: 'belongsToMKGroup', width: 20 },
      { header: 'Reference Info', key: 'referenceInfo', width: 40 },
      { header: 'Registration Date', key: 'registrationDate', width: 20 }
    ];
    
    // Add data rows
    registrations.forEach(reg => {
      worksheet.addRow({
        ...reg._doc,
        registrationDate: reg.registrationDate.toLocaleString()
      });
    });
    
    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=conference_registrations.xlsx'
    );
    
    // Send the workbook
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Error exporting registrations:', error);
    res.status(500).json({ message: 'Error exporting registrations' });
  }
});

// Registration Endpoint
app.post('/api/register', async (req, res) => {
  try {
    const registrationData = req.body;
    
    // Check if email already exists
    const existingRegistration = await Registration.findOne({ email: registrationData.email });
    if (existingRegistration) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    const newRegistration = new Registration(registrationData);
    await newRegistration.save();
    
    res.status(201).json({ 
      message: 'Registration successful',
      registration: newRegistration
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});



// Contact Form With Resend API Endpoint


// @desc    Send contact message
// @route   POST /api/contact/send
// @access  Public
app.post('/api/contact', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate message length
    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Message must be at least 10 characters long'
      });
    }

    // Save message to database
    const contactMessage = await Contacts.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      message: message.trim()
    });

    // Prepare email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">New Contact Message</h2>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #555; margin-bottom: 5px;">Contact Details:</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${firstName}</p>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${lastName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            ${phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${phone}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #555; margin-bottom: 10px;">Message:</h3>
            <div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50;">
              <p style="margin: 0; line-height: 1.6; color: #333;">${message.replace(/\n/g, '<br>')}</p>
            </div>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
            <p style="margin: 0;">This message was sent through your church website contact form.</p>
            <p style="margin: 5px 0 0 0;">Please reply directly to: ${email}</p>
          </div>
        </div>
      </div>
    `;

    const emailText = `
      New Contact Message

      Contact Details:
      Firstname: ${firstName}
      Lastname: ${lastName}
      Email: ${email}
      ${phone ? `Phone: ${phone}` : ''}
      Date: ${new Date().toLocaleString()}

      Message:
      ${message}

      ---
      This message was sent through pacmack's website contact form.
      Please reply directly to: ${email}
          `;

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: 'pacmack.com', // Replace with your verified domain
      to: [process.env.PASTOR_EMAIL],
      subject: `New Contact Message from ${firstName}`,
      html: emailHtml,
      text: emailText,
      replyTo: email
    });

    console.log('Email sent successfully:', emailResponse.id);

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully! We will get back to you soon.',
      data: {
        id: contactMessage._id,
        firstName: contactMessage.firstName,
        lastName: contactMessage.lastName,
        email: contactMessage.email,
        sentAt: contactMessage.createdAt
      }
    });

  } catch (error) {
    console.error('Contact message error:', error);
    
    // More specific error messages
    let errorMessage = 'Failed to send message. Please try again later.';
    if (error.name === 'ValidationError') {
      errorMessage = 'Validation failed: ' + Object.values(error.errors).map(e => e.message).join(', ');
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));