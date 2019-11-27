<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='utf-8'>
    <!-- <link rel="stylesheet" href="style.css">   -->
    <title>Blog | shdown.github.io</title>
</head>
<body>

<main>
    % for post in posts:
        <article>
            [<time datetime="${post.created_at.strftime("%Y-%m-%d") | h}">${post.created_at.strftime("%d %b %Y") | h}</time>]
            <a href="post-${post.basename | h}.html">${post.content.title | h}</a>
        </article>
        <hr/>
    % endfor
</main>

<footer>
    <nav>
    Pages:
    % for i in range(npages):
        % if i == page_index:
            [${i | h}]
        % else:
            [<a href="blog-${i | h}.html">${i | h}</a>]
        % endif
    % endfor
    </nav>
</footer>

</body>
</html>
