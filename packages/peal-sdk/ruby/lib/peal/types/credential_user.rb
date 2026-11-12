# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CredentialUser < Internal::Types::Model
      field :application, -> { Peal::Types::CredentialApplication }, optional: false, nullable: true

      field :user_id, -> { String }, optional: false, nullable: false, api_name: "userId"
    end
  end
end
