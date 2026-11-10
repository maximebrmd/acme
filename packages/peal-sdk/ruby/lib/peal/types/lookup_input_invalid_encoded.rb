# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class LookupInputInvalidEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::LookupInputInvalidEncodedTag }, optional: false, nullable: false, api_name: "_tag"
    end
  end
end
