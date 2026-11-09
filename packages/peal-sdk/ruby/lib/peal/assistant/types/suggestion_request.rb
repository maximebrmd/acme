# frozen_string_literal: true

module Peal
  module Assistant
    module Types
      class SuggestionRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :action, -> { Peal::Types::AssistantAction }, optional: false, nullable: false

        field :text, -> { String }, optional: false, nullable: false
      end
    end
  end
end
