# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PartnerDetailsInvalidEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::PartnerDetailsInvalidEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :field, -> { Peal::Types::PartnerDetailField }, optional: false, nullable: false
    end
  end
end
