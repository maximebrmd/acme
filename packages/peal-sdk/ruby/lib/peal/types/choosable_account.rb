# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChoosableAccount < Internal::Types::Model
      field :account_id, -> { String }, optional: false, nullable: false, api_name: "accountId"

      field :avatar_url, -> { String }, optional: false, nullable: true, api_name: "avatarUrl"

      field :connected, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :display_name, -> { String }, optional: false, nullable: true, api_name: "displayName"

      field :handle, -> { String }, optional: false, nullable: false
    end
  end
end
