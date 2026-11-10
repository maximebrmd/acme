# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AccountRestrictionMediaTypesRefused < Internal::Types::Model
      field :content_types, -> { Internal::Types::Array[Peal::Types::MediaContentType] }, optional: false, nullable: false, api_name: "contentTypes"
    end
  end
end
