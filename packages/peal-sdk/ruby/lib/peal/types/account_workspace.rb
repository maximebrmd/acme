# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AccountWorkspace < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: false

      field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
    end
  end
end
