# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WorkspaceBusyEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::WorkspaceBusyEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
    end
  end
end
