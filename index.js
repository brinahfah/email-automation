process.env.TZ = "UTC";
require("dotenv").config();

const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

// Firebase init
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
  if (!to) {
    console.error("❌ EMAIL DESTINATAIRE VIDE !");
    return;
  }

  await sgMail.send({
    to,
    from: process.env.SENDGRID_EMAIL,
    subject,
    text,
  });
}

// différence en jours
function getDiffDays(date) {
  const now = new Date();

  const today = new Date(Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ));

  const target = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ));

  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

async function getReferentEmail() {
  const snap = await db.collection("referent").limit(1).get();

  console.log("📦 referent docs:", snap.size);

  if (snap.empty) {
    throw new Error("Aucun référent trouvé");
  }

  const data = snap.docs[0].data();

  console.log("📧 referent data:", data);

  return data.email;
}

async function checkDeadlines() {
  const emailReferent = await getReferentEmail();

  const snap = await db.collection("deadlines").get();

  for (const doc of snap.docs) {
    const data = doc.data();

    const date = data.dateEcheance.toDate();
    const diff = getDiffDays(date);
    const ref = doc.ref;
    const notif = data.notificationsEnvoyees || {};

    // 🔵 J-7
   if (diff === 7 && !notif.j7) {
     await sendEmail(
       emailReferent,
       "📌 Rappel échéance",
       `Mission/RDV ${data.numero} dans environ 1 semaine`
     );

     await ref.update({
       "notificationsEnvoyees.j7": true,
     });
   }

    // 🔴 Jour J
    if (diff === 0 && !notif.j0) {
      await sendEmail(
        emailReferent,
        "⚠️ Échéance aujourd’hui",
        `Mission/RDV ${data.numero} à faire aujourd’hui`
      );

      await ref.update({
        "notificationsEnvoyees.j0": true,
      });
    }

    // 🔥 J+7
    if (diff === -7 && !notif.jm7) {
      await sendEmail(
        emailReferent,
        "🔥 Échéance en retard",
        `Mission/RDV ${data.numero} non complété depuis 1 semaine`
      );

      await ref.update({
        "notificationsEnvoyees.jm7": true,
      });
    }
  }
}

async function main() {
  try {
    await checkDeadlines();
    console.log("✔ Vérification deadlines terminée");
  } catch (e) {
    console.error("❌ Erreur script :", e);
  }
}

main();