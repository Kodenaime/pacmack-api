import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));