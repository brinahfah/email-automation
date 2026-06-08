require("dotenv").config();

const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

// 🔐 Firebase init (UNE seule fois)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}

sgMail.setApiKey(process.env.SENDGRID_KEY);

const db = admin.firestore();

async function sendEmail(to, subject, text) {
  await sgMail.send({
    to,
    from: process.env.SENDGRID_EMAIL,
    subject,
    text,
  });
}

function getDiffDays(date) {
  const today = new Date();
  return Math.floor((date - today) / (1000 * 60 * 60 * 24));
}

async function checkMissions() {
  const missionsSnap = await db.collection("missions").get();

  for (const doc of missionsSnap.docs) {
    const data = doc.data();

    if (!data.dateButoir || !data.emailReferent) continue;

    const date = data.dateButoir.toDate();
    const diff = getDiffDays(date);

    // 🔔 J-7
    if (diff === 7) {
      await sendEmail(
        data.emailReferent,
        "📌 Rappel mission",
        "Mission à compléter dans 7 jours"
      );
    }

    // ⚠️ Jour J
    if (diff === 0 && data.statut !== "Complété") {
      await sendEmail(
        data.emailReferent,
        "⚠️ Mission à compléter",
        "C’est aujourd’hui !"
      );
    }

    // 🔥 J+7
    if (diff === -7 && data.statut !== "Complété") {
      await sendEmail(
        data.emailReferent,
        "🔥 Mission en retard",
        "Mission toujours non complétée"
      );
    }
  }
}

async function main() {
  await checkMissions();
  console.log("✔ Vérification terminée");
}

main();