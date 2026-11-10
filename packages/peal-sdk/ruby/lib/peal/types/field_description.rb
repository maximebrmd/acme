# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class FieldDescription < Internal::Types::Model
      field :forbidden_characters, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "forbiddenCharacters"

      field :if_left_out, -> { Peal::Types::FieldDefault }, optional: false, nullable: true, api_name: "ifLeftOut"

      field :lookup, -> { Peal::Types::LookupName }, optional: false, nullable: true

      field :max_length, -> { Integer }, optional: false, nullable: true, api_name: "maxLength"

      field :maximum, -> { Integer }, optional: false, nullable: true

      field :minimum, -> { Integer }, optional: false, nullable: true

      field :name, -> { String }, optional: false, nullable: false

      field :pattern, -> { String }, optional: false, nullable: true

      field :required, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :type, -> { Peal::Types::FieldType }, optional: false, nullable: false

      field :values, -> { Internal::Types::Array[String] }, optional: false, nullable: false
    end
  end
end
