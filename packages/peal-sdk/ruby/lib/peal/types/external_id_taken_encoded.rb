# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ExternalIDTakenEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::ExternalIDTakenEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
    end
  end
end
