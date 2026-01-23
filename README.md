# dlkn
The website for dlkn team

Auto-deployed on push to github

dlkn.club

## Local dev (Jekyll)

Prereqs:
- Ruby `3.3.4` (see `.ruby-version`; easiest via `rbenv`/`ruby-build`)
- Bundler `2.6.1` (see `Gemfile.lock`)

Run:
```bash
bundle _2.6.1_ install
bundle exec jekyll serve --livereload
```

## Remote dev on a server

On the server:
```bash
bundle _2.6.1_ install
bundle exec jekyll serve --host 0.0.0.0 --port 4000
```

Then open `http://<server-ip>:4000` (make sure the port is allowed in firewall/security group).

If you don't want to expose the port publicly, run Jekyll bound to localhost and tunnel:
```bash
# server
bundle exec jekyll serve --host 127.0.0.1 --port 4000

# your laptop
ssh -L 4000:127.0.0.1:4000 <user>@<server>
```
