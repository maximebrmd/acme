# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class DuplicatePostEncoded < Internal::Types::Model
      field :duplicates, -> { Internal::Types::Array[Peal::Types::DuplicateOnChannel] }, optional: false, nullable: false
    end
  end
end
