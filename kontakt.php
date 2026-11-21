<?php

$recipient = 'wkillmann@t-online.de';
$sender    = 'info@laufklub-hameln.de';

// Nur POST zulassen
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST', true, 405);
    exit;
}

// Eingaben auslesen
$name    = trim($_POST['name'] ?? '');
$email   = trim($_POST['email'] ?? '');
$message = trim($_POST['message'] ?? '');
$privacy = isset($_POST['privacy']);

// 1. Honeypot: Dieses Feld muss leer bleiben
if (!empty($_POST['website'] ?? '')) {
    exit;
}

// 2. Zeitprüfung
$started = (int)($_POST['form_started'] ?? 0);

if ($started <= 0 || time() - $started < 3) {
    exit;
}

// 3. Eingaben validieren
if (
    $name === '' ||
    strlen($name) > 100 ||
    !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    strlen($message) < 3 ||
    strlen($message) > 5000 ||
    !$privacy
) {
    exit('Bitte alle Felder korrekt ausfüllen.');
}

// 4. Rate-Limiting: maximal 3 Anfragen pro Stunde
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$key = hash('sha256', $ip);
$file = sys_get_temp_dir() . '/kontakt_' . $key . '.json';

$fp = fopen($file, 'c+');

if (!$fp || !flock($fp, LOCK_EX)) {
    exit('Derzeit ist keine Übermittlung möglich.');
}

$stored = stream_get_contents($fp);
$data = json_decode($stored ?: '{}', true);

if (!is_array($data)) {
    $data = [];
}

$now = time();

$data['times'] = array_values(array_filter(
    $data['times'] ?? [],
    fn($t) => is_numeric($t) && $t > $now - 3600
));

if (count($data['times']) >= 3) {
    flock($fp, LOCK_UN);
    fclose($fp);
    exit('Bitte versuchen Sie es später erneut.');
}

$data['times'][] = $now;

rewind($fp);
ftruncate($fp, 0);
fwrite($fp, json_encode($data));
fflush($fp);

flock($fp, LOCK_UN);
fclose($fp);

// 5. Mailheader absichern
$name = str_replace(["\r", "\n"], '', $name);
$name = strip_tags($name);
$message = strip_tags($message);

$subject = 'Neue Kontaktanfrage von ' . $name;

$headers = [
    'From: Laufklub Hameln <' . $sender . '>',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
];

$body = "Name: $name\n";
$body .= "E-Mail: $email\n\n";
$body .= "Nachricht:\n$message";

// 6. E-Mail versenden
if (mail($recipient, $subject, $body, implode("\r\n", $headers))) {
    header('Location: /danke.html', true, 303);
    exit;
} else {
    http_response_code(500);
    exit('Leider ist beim Versand ein Fehler aufgetreten.');
}

?>
