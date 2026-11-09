# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConnectOutcomeChoose < Internal::Types::Model
      field :accounts, -> { Internal::Types::Array[Peal::Types::ChoosableAccount] }, optional: false, nullable: false

      field :expires_at, -> { String }, optional: false, nullable: false, api_name: "expiresAt"

      field :selection, -> { String }, optional: false, nullable: false
    end
  end
end
