# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostContentInvalidEncoded < Internal::Types::Model
      field :violations, -> { Internal::Types::Array[Peal::Types::ContentViolation] }, optional: false, nullable: false
    end
  end
end
