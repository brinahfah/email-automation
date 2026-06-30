require("dotenv").config();

const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

// 🔐 Firebase init
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}

sgMail.setApiKey(process.env.SENDGRID_KEY);

const db = admin.firestore();

// 📧 ENVOI EMAIL
async function sendEmail(to, subject, text) {
  try {
    console.log("📨 Envoi email vers :", to);

    const result = await sgMail.send({
      to,
      from: process.env.SENDGRID_EMAIL,
      subject,
      text,
    });

    console.log("✅ Email envoyé :", result[0].statusCode);
  } catch (err) {
    console.error("❌ ERREUR SENDGRID :", err.response?.body || err);
  }
}

// ⏳ CALCUL DIFF JOURS
function getDiffDays(date) {
  const today = new Date();
  return Math.floor((date - today) / (1000 * 60 * 60 * 24));
}

// 📌 MISSIONS + NOTIFICATIONS
async function checkMissions() {
  const referentSnap = await db.collection("referents").limit(1).get();
  const emailReferent = referentSnap.docs[0].data().email_referent;

  const missionsSnap = await db.collection("missions").get();

  for (const doc of missionsSnap.docs) {
    const data = doc.data();

    console.log("Mission :", data.numero);

    await sendEmail(
      emailReferent,
      "TEST MISSION",
      `Mission numéro ${data.numero}`
    );
  }
}

// 🚀 MAIN UNIQUE
async function main() {
  try {
    await sendEmail(
      "ebikie4@gmail.com",
      "Test GitHub + SendGrid",
      "🎉 Félicitations ! Si tu lis cet email, GitHub Actions et SendGrid fonctionnent."
    );

    console.log("Email envoyé avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'envoi :", error);
  }
}

main();