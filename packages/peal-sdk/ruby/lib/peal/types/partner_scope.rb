# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PartnerScope
      extend Peal::Internal::Types::Enum

      WORKSPACES_READ = "workspaces:read"
      WORKSPACES_WRITE = "workspaces:write"
      WORKSPACES_DELETE = "workspaces:delete"
    end
  end
end
