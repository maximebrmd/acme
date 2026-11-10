# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Signature < Internal::Types::Model
      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :id, -> { String }, optional: false, nullable: false

      field :is_default, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "isDefault"

      field :name, -> { String }, optional: false, nullable: false

      field :scope, -> { Peal::Types::SignatureScope }, optional: false, nullable: false

      field :text, -> { String }, optional: false, nullable: false
    end
  end
end
