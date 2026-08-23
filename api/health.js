export default function handler(req, res) {
  return res.status(200).json({
    status: "ok",
    message: "Document Summary Assistant API is working"
  });
}