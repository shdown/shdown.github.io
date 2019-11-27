<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='utf-8'>
    <style>
        .my-date {
            font-style: italic;
        }
    </style>
    <title>${post.content.title | h} | shdown.github.io</title>
</head>
<body>

<main>
    <article>
        <time class="my-date" datetime="${post.created_at.strftime("%Y-%m-%d") | h}">${post.created_at.strftime("%d %b %Y") | h}</time>
        <header>
            <h1>${post.content.title | h}</h1>
        </header>
        ${post.content.body_html}
    </article>
</main>

</body>
</html>
