# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MeUser < Internal::Types::Model
      field :email, -> { String }, optional: false, nullable: false

      field :email_verified, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "emailVerified"

      field :id, -> { String }, optional: false, nullable: false

      field :image, -> { String }, optional: false, nullable: true

      field :locale, -> { Peal::Types::MeUserLocale }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false
    end
  end
end
