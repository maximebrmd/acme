# frozen_string_literal: true

# Ours (see .fernignore): what the generated gemspec cannot know. It loads
# this file and calls add_custom_gemspec_data once it has set the rest.

def add_custom_gemspec_data(spec)
  spec.summary = "Client for the Peal API: schedule social media posts across platforms."
  spec.description = spec.summary
  spec.email = ["hello@peal.social"]
  spec.homepage = "https://peal.social"
  spec.license = "Apache-2.0"
  spec.metadata["source_code_uri"] = "https://github.com/peal-social/peal/tree/main/packages/peal-sdk/ruby"
  spec.metadata["bug_tracker_uri"] = "https://github.com/peal-social/peal/issues"
  # The library, its README, its license and its notice: nothing this
  # repository needs (project.json, the smoke test, Fern's records).
  spec.files = Dir["lib/**/*.rb", "README.md", "LICENSE", "NOTICE"]
end
