# frozen_string_literal: true

module Peal
  module Channels
    module Types
      class ChooseAccounts < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false

        field :account_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "accountIds"

        field :selection, -> { String }, optional: false, nullable: false
      end
    end
  end
end
