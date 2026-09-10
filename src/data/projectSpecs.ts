import { ProjectSpecData } from '../types';

export const INITIAL_PROJECT_SPECS: ProjectSpecData = {
  title: "Real-time Facial Recognition System for Crowd Dynamics in Public Spaces",
  status: "Approved",
  problemDescription:
    "Develop a low-latency, real-time facial recognition system for identification of crowd dynamics in public spaces. This system should accurately track individuals across cameras, distinguishing between different people and handling partial occlusions. Additionally, it should identify suspicious activity and alert authorities.",
  objectives:
    "Identify individuals in crowds, track them across cameras, detect suspicious behavior, and alert authorities. Understand computer vision techniques such as object detection, tracking, and clustering; implement a low-latency, real-time facial recognition system using deep learning algorithms; and design a secure system for data transmission and storage.",
  proposedSolution: [
    "(1) use Convolutional Neural Networks (CNNs) for face detection and recognition",
    "(2) employ Optical Flow techniques to track individuals across cameras",
    "(3) develop a machine learning-based clustering algorithm to differentiate between individuals",
    "(4) design a web-based interface for authorities to view and analyze crowd dynamics",
  ],
  technologyStack: {
    "Deep Learning Core": "TensorFlow.js (BlazeFace 6-landmark Face Detector & MobileNet SSD)",
    "Computer Vision": "Real-time HTML5 Canvas Computer Vision, Optical Flow vector field",
    "Object Detection": "COCO-SSD & Neural Sentry (Expanded public categories: pens, cars, transit, luggage & dangerous weapons/knives with audio siren alerts)",
    "Data Transmission": "Express API for telemetry streaming & Gemini AI dispatch",
    "Database Management": "Client & LocalStorage biometric embedding registry for Re-ID",
  },
  problemType: "Community Sdg",
};
