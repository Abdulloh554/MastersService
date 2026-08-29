import { Request, Response, NextFunction } from "express";
import { suggestListing } from "../services/ai/listingSuggest.service";
import { answerSupportQuestion } from "../services/ai/supportChat.service";
import { enhanceProfile } from "../services/ai/profileEnhance.service";
import { generateProduct } from "../services/ai/productGenerate.service";

export const listingSuggest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { description, imageUrl, language } = req.body;
    const data = await suggestListing(description, imageUrl, language || "uz");

    if (!data) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "AI unavailable, please choose manually",
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const supportChat = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { message, conversationHistory, language } = req.body;
    const result = await answerSupportQuestion(
      message,
      conversationHistory || [],
      language || "uz"
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const profileEnhance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { rawText, sourceLanguage } = req.body;
    const result = await enhanceProfile(rawText, sourceLanguage || "uz");

    if (!result) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "AI unavailable, please refine manually",
      });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const productGenerate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productName, imageUrls, categoryHint } = req.body;
    const result = await generateProduct(productName, imageUrls, categoryHint);

    if (!result) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "AI unavailable, please fill fields manually",
      });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
