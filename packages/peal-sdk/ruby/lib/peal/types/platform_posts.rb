# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PlatformPosts < Internal::Types::Model
      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

      field :posts, -> { Integer }, optional: false, nullable: false
    end
  end
end
