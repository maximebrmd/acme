# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AltTextTooLongEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::AltTextTooLongEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :max_length, -> { Integer }, optional: false, nullable: false, api_name: "maxLength"
    end
  end
end
