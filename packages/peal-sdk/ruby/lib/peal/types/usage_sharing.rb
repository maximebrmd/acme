# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UsageSharing < Internal::Types::Model
      field :partner_workspace_id, -> { String }, optional: false, nullable: false, api_name: "partnerWorkspaceId"
    end
  end
end
