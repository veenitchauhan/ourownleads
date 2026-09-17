<?php

namespace App\Policies;

use App\Models\LeadSheet;
use App\Models\User;

class LeadSheetPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, LeadSheet $leadSheet): bool
    {
        return $this->ownsSheet($user, $leadSheet);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, LeadSheet $leadSheet): bool
    {
        return $this->ownsSheet($user, $leadSheet);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, LeadSheet $leadSheet): bool
    {
        return $this->ownsSheet($user, $leadSheet);
    }

    /**
     * Check if the user owns the sheet directly or through their current team.
     */
    protected function ownsSheet(User $user, LeadSheet $leadSheet): bool
    {
        if ($leadSheet->user_id === $user->id) {
            return true;
        }

        $team = $user->currentTeam;
        if ($team && $leadSheet->team_id && $leadSheet->team_id === $team->id) {
            return true;
        }

        return false;
    }
}
