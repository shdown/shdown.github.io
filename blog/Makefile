include config.mk

DSSSG := ./dsssg

PAGES := siteroot/blog-0.html

TMPL_INCLUDES := $(wildcard templates/include/*)

POST_MDS := $(wildcard content/*.md)
POST_HTMLS := $(patsubst content/%.md,siteroot/post-%.html,$(POST_MDS))

CUSTOM_TMPLS := $(wildcard templates/custom/*.tpl)
CUSTOM_HTMLS := $(patsubst templates/custom/%.tpl,siteroot/%.html,$(CUSTOM_TMPLS))

STATIC_FILES := $(wildcard static/*)
CUSTOM_FILES := $(patsubst static/%,siteroot/%,$(STATIC_FILES))

all: $(PAGES) $(POST_HTMLS) $(CUSTOM_HTMLS) $(CUSTOM_FILES)

$(PAGES): $(POST_MDS) $(TMPL_INCLUDES)
	$(DSSSG) pages $(POSTS_PER_PAGE)

siteroot/post-%.html: content/%.md $(TMPL_INCLUDES)
	$(DSSSG) post -- $*

siteroot/%.html: templates/custom/%.tpl $(TMPL_INCLUDES)
	$(DSSSG) render-custom -- $*

siteroot/%: static/%
	cp $^ $@

post:
	@set -e; \
	t=$$(mktemp --suffix=.md); \
	while true; do \
		$(EDITOR) "$$t"; \
		b=$$($(DSSSG) get-basename "$$t") && break; \
		echo -n '>>> Enter to edit again, ^C to abort: '; \
		read -r junk; \
	done; \
	mv "$$t" "content/$$b.md";
	$(MAKE)

push:
	@set -e -x; \
	cd siteroot; \
	git add '.'; \
	git commit -m 'Update' || true; \
	git push;

.PHONY: all post push
