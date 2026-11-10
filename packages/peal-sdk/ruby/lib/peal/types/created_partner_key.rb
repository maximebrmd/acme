# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CreatedPartnerKey < Internal::Types::Model
      field :key, -> { String }, optional: false, nullable: false

      field :partner_key, -> { Peal::Types::PartnerKey }, optional: false, nullable: false, api_name: "partnerKey"
    end
  end
end
