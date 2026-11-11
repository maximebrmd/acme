# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MeteredPosts < Internal::Types::Model
      field :month, -> { String }, optional: false, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :posts, -> { Integer }, optional: false, nullable: false

      field :posts_with_links, -> { Integer }, optional: false, nullable: false, api_name: "postsWithLinks"
    end
  end
end
