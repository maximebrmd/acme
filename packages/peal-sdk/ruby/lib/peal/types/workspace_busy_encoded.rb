# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WorkspaceBusyEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::WorkspaceBusyEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
    end
  end
end
