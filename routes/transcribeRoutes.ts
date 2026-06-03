import { Router } from "express";
import multer from "multer";
import {
  transcribeLocal,
  transcribeDrive,
  transcribeUrl,
} from "../controllers/transcribeController";

// Config Multer for video file upload parsing (local/PC/mobile clients)
const upload = multer({
  dest: "/tmp/",
  limits: {
    fileSize: 100 * 1024 * 1024, // Limit to 100MB
  },
});

const router = Router();

// Hook up controllers to their endpoints
router.post("/transcribe-local", upload.single("video"), transcribeLocal);
router.post("/transcribe-drive", transcribeDrive);
router.post("/transcribe-url", transcribeUrl);

export default router;
