# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxMessageApplication < Internal::Types::Model
      field :client_id, -> { String }, optional: false, nullable: false, api_name: "clientId"

      field :granted_at, -> { String }, optional: false, nullable: false, api_name: "grantedAt"

      field :granted_by, -> { String }, optional: false, nullable: true, api_name: "grantedBy"
    end
  end
end
