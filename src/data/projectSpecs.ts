import { ProjectSpecData } from '../types';

export const INITIAL_PROJECT_SPECS: ProjectSpecData = {
  title: "Real-time Facial Recognition System for Crowd Dynamics in Public Spaces",
  status: "Approved",
  problemDescription:
    "Develop a low-latency, real-time facial recognition system for identification of crowd dynamics in public spaces. This system should accurately track individuals across cameras, distinguishing between different people and handling partial occlusions. Additionally, it should identify suspicious activity and alert authorities.",
  objectives:
    "Identify individuals in crowds, track them across cameras, detect suspicious behavior, and alert authorities. Students should understand computer vision techniques such as object detection, tracking, and clustering; implement a low-latency, real-time facial recognition system using deep learning algorithms; and design a secure system for data transmission and storage.",
  proposedSolution: [
    "(1) use Convolutional Neural Networks (CNNs) for face detection and recognition",
    "(2) employ Optical Flow techniques to track individuals across cameras",
    "(3) develop a machine learning-based clustering algorithm to differentiate between individuals",
    "(4) design a web-based interface for authorities to view and analyze crowd dynamics",
  ],
  technologyStack: {
    "Deep Learning Core": "TensorFlow 2.x CNNs (MobileNetV2 / ArcFace 128D & 512D Embeddings)",
    "Computer Vision": "OpenCV 4.x (Lucas-Kanade Tracking & Gunnar Farneback Dense Optical Flow)",
    "Machine Learning Clustering": "DBSCAN on Cosine Distance Matrices for Multi-Camera Re-ID & Handover",
    "Containerization": "Docker for containerization & multi-service Docker Compose topology",
    "Data Transmission": "Flask REST & MJPEG Streaming API for low-latency transmission",
    "Database Management": "PostgreSQL 16 for biometric face registry, cross-camera timelines & incident logs",
  },
  problemType: "Community Sdg",
};
