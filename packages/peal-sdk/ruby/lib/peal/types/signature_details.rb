# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class SignatureDetails < Internal::Types::Model
      field :is_default, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "isDefault"

      field :name, -> { String }, optional: false, nullable: false

      field :scope, -> { Peal::Types::SignatureScope }, optional: true, nullable: false

      field :text, -> { String }, optional: false, nullable: false
    end
  end
end
