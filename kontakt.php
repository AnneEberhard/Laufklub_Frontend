<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Eingaben bereinigen
    $name    = htmlspecialchars(trim($_POST["name"] ?? ""));
    $email   = filter_var(trim($_POST["email"] ?? ""), FILTER_VALIDATE_EMAIL);
    $message = htmlspecialchars(trim($_POST["message"] ?? ""));
    $privacy = isset($_POST["privacy"]);

    // Validierung
    if (!$name || !$email || !$message || !$privacy) {
        echo "Bitte alle Felder korrekt ausfüllen und Datenschutz akzeptieren.";
        exit;
    }

    // Mail vorbereiten
    $to      = "anne.eberhard@gmx.net";
    $subject = "Neue Kontaktanfrage von $name";
    $body    = "Name: $name\nE-Mail: $email\n\nNachricht:\n$message";
    $headers = "From: $email\r\nReply-To: $email\r\n";

    // Mail verschicken
    if (mail($to, $subject, $body, $headers)) {
        echo "Vielen Dank, $name! Die Nachricht wurde gesendet.";
    } else {
        echo "Leider ist ein Fehler aufgetreten. Bitte versuchen Sie später erneut.";
    }
}
