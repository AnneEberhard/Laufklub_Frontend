<?php
$recipient = 'wkillmann@t-online.de';

switch ($_SERVER['REQUEST_METHOD']) {
    case ("OPTIONS"): // Allow preflighting to take place.
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: POST");
        header("Access-Control-Allow-Headers: content-type");
        exit;
    case ("POST"):
        header("Access-Control-Allow-Origin: *");

        $name    = htmlspecialchars(trim($_POST["name"] ?? ""));
        $email   = filter_var(trim($_POST["email"] ?? ""), FILTER_VALIDATE_EMAIL);
        $message = htmlspecialchars(trim($_POST["message"] ?? ""));
        $privacy = isset($_POST["privacy"]);

        // Validierung
        if (!$name || !$email || !$message || !$privacy) {
            echo "Bitte alle Felder korrekt ausfüllen und Datenschutz akzeptieren.";
            exit;
        }

        $subject = "Neue Kontaktanfrage von $name";
        $headers = "From: $email";
        $body    = "Name: $name\nE-Mail: $email\n\nNachricht:\n$message";

        if (mail($recipient, $subject, $body, $headers)) {
            //echo "Vielen Dank, $name! Die Nachricht wurde gesendet.";
            header("Location: danke.html");
            exit;
        } else {
            echo "Leider ist ein Fehler aufgetreten. Bitte versuchen Sie später erneut.";
        }
        break;
    default:
        header("Allow: POST", true, 405);
        exit;
}
?>
